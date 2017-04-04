/**
 * Сервис для изменения статусов объектов
 * Другими словами - отправка на согласование, на доработку, утверждение и т.п.
 */

try {
    var conn = $.db.getConnection();

    var objects = JSON.parse($.request.parameters.get("objects"));

    for (var i = 0; i < objects.length; i++) {
        var id = parseInt(objects[i].id);
        var version = parseInt(objects[i].version);
        var status_is = parseInt($.request.parameters.get("status_is"));
        var status_will = parseInt($.request.parameters.get("status_will"));
        var comment = $.request.parameters.get("comment").toString().trim();
        var type = $.request.parameters.get("type").toString().trim();

        var pstmt;

        // если карточка утверждается, нужна особая прелюдия
        if (status_will === 5) {
            switch (type) {
                case "ias":
                    pstmt = conn.prepareStatement(
                        "update Z_BOBJ_REPO.T_IAS " +
                        "set IS_ACTIVE = true " +
                        "where id_ias = ? " +
                        "and version = ?"
                    );
                    pstmt.setInteger(1, id);
                    pstmt.setInteger(2, version);
                    pstmt.execute();
                    break;
                case "dict":
                    pstmt = conn.prepareStatement(
                        "update Z_BOBJ_REPO.T_DICTIONARY " +
                        "set IS_ACTIVE = true " +
                        "where id_dictionary = ? " +
                        "and version = ?"
                    );
                    pstmt.setBigInt(1, id);
                    pstmt.setInteger(2, version);
                    pstmt.execute();
                    break;
                case "card":
                    
                    // вот тут есть нюанс, перед тем как сохранять нужно проверить
                    // ссылаются ли на эту версию БО варианты расчета. Если ссылаются, то их нужно
                    // утвердить первыми.
                    
                    checkCalcsDontApprovedForCard(id, version);
                    
                    // новую нужно сделать  активной
                    pstmt = conn.prepareStatement(
                        "update Z_BOBJ_REPO.T_CARD " +
                        "set IS_ACTIVE = true " +
                        "where id_card = ? " +
                        "and version = ?"
                    );
                    pstmt.setInteger(1, id);
                    pstmt.setInteger(2, version);
                    pstmt.execute();

                    // старую нужно сделать не активной
                    pstmt = conn.prepareStatement(
                        "update Z_BOBJ_REPO.T_CARD " +
                        "set IS_ACTIVE = false " +
                        "where id_card = ? " +
                        "and version = ?"
                    );
                    pstmt.setInteger(1, id);
                    pstmt.setInteger(2, version - 1);
                    pstmt.execute();
                    
                    // Старую карточку отправляем в статус "Неактуальна"
                    pstmt = conn.prepareStatement(
                        "insert into Z_BOBJ_REPO.T_HISTORY_STATUS " +
                        "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
                        "values (?, ?, ?, ?, ?, current_user, current_timestamp) "
                    );
                    pstmt.setBigInt(1, id);
                    pstmt.setInteger(2, version-1);
                    pstmt.setInteger(3, 5);
                    pstmt.setInteger(4, 6);
                    pstmt.setString(5, "Заменена предыдущей версией");
                    pstmt.execute();
                    
                    break;
                case "calc":
                    //   status_will = 4;
                    pstmt = conn.prepareStatement(
                        "update Z_BOBJ_REPO.T_CALC " +
                        "set IS_ACTIVE = true " +
                        "where id_CALC = ? " +
                        "and version_calc = ?"
                    );
                    pstmt.setBigInt(1, id);
                    pstmt.setInteger(2, version);
                    pstmt.execute();
                    break;
            }
        }

        // Записываем историю изменения объекта
        pstmt = conn.prepareStatement(
            "insert into Z_BOBJ_REPO.T_HISTORY_STATUS " +
            "(ID_OBJECT, VERSION, STATUS_WAS, STATUS_IS, COMMENT, AUTHOR, CREATION_DATE) " +
            "values (?, ?, ?, ?, ?, current_user, current_timestamp) "
        );
        pstmt.setBigInt(1, id);
        pstmt.setInteger(2, version);
        pstmt.setInteger(3, status_is);
        pstmt.setInteger(4, status_will);
        pstmt.setString(5, comment);
        pstmt.execute();

        $.response.status = $.net.http.OK;
    }
    conn.commit();

} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}



function checkCalcsDontApprovedForCard(id, version) {

    var pstmt = conn.prepareStatement(" SELECT ID_CALC, VERSION_CALC, NAME_CALC "
            + " FROM Z_BOBJ_REPO.T_CALC where IS_ACTIVE=true and ID_CARD = ? and "
            + " VERSION_CARD=?       ");

    pstmt.setBigInt(1, id);
    pstmt.setInteger(2, version);

    let  rs = pstmt.executeQuery();
    let  calcs = [];

    while (rs.next()) {
        calcs.push({
            "id_calc" : rs.getInteger(1),
            "version_calc" : rs.getInteger(2),
            "name_calc" : rs.getNString(3)
        });
    }

    // склеиваем по имени
    var sNames = calcs.map(function(elem){
          return elem.name_calc;
      }).join(",");
    
    if (sNames.length > 0 ) {
        throw "Утвердите сначала варианты расчета :\\n " + sNames

    }
    
    
    
}


