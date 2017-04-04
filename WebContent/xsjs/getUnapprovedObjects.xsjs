/**
 *************************************************************
 * Возвращает список неутвержденных объектов Репозитрия      *
 *************************************************************
 *
 * @param  GET запрос, параметры
 *		status      - статус возвращаемых объектов. Два значения:
 *					1)	change - для объектов Создано, На доработке
 *					2)  approve - для объектов На согласновании, Солгасовано
 *      type        - тип запрашиваемого объекта. Значения [card/dict/calc/ias]
 *
 * @return
 *			{
        	 "iId",
             "iVersion",
             "sName",
             "sStatusIs",
             "sStatusWas",
             "iCodeStatusIs",
             "iCodeStatusWas",
             "sComment",
             "sAuthor",
             "sDate"
        }
 * @author domozhakov_mv@surgutneftegas.ru
 *
 */


if ($.request.method === $.net.http.GET) {
    let conn = $.db.getConnection();

    let sStatus = $.request.parameters.get("status");
    let sType = $.request.parameters.get("type");

    let ps = conn.prepareStatement(
        "SELECT ID, VERSION,  NAME, STATUS_WAS, STATUS_IS, " +
        "STATUS_IS_KEY, STATUS_WAS_KEY, " +
        "COMMENT, AUTHOR, to_date(CREATION_DATE) from \"_SYS_BIC\".\"bobj_repo.views/CV_UNAPPROVED_OBJECTS\" " +
        "where TECH_STATUS = ? " +
        "and TYPE = ?"+ 
        " ORDER BY  CREATION_DATE DESC "
    );
    ps.setString(1, sStatus);
    ps.setString(2, sType);
    let result = ps.executeQuery();

    let out = [];
    while (result.next()) {
        out.push({
            "iId": result.getInteger(1),
            "iVersion": result.getInteger(2),
            "sName": result.getNString(3),
            "sStatusWas": result.getNString(4),
            "sStatusIs": result.getNString(5),
            "iCodeStatusIs": result.getInteger(6),
            "iCodeStatusWas": result.getInteger(7),
            "sComment": result.getNString(8),
            "sAuthor": result.getNString(9),
            "sDate": result.getString(10),
            "sType": sType,
            "sStatus": sStatus
        });
    }

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
