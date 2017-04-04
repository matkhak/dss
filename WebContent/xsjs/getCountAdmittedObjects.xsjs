/**
 **********************************************************************
 * Возвращает количество неутвержденных объектов по типам и статусам  *
 **********************************************************************
 *
 * @param  GET запрос, без параметров
 *
 *
 * @return

        }
 * @author domozhakov_mv@surgutneftegas.ru
 *
 */

if ($.request.method === $.net.http.GET) {
    let conn = $.db.getConnection();

    let ps = conn.prepareStatement(
        "select type, tech_status, count(id) " +
        "from \"_SYS_BIC\".\"bobj_repo.views/CV_UNAPPROVED_OBJECTS\" " +
        "group by type, tech_status " +
        "order by 1 "
    );
    let result = ps.executeQuery();

    let data = [];
    while (result.next()) {
        data.push({
            "type": result.getNString(1),
            "status": result.getNString(2),
            "count": result.getInteger(3)
        });
    }

    var out = {
        card: {},
        calc: {},
        dict: {},
        ias: {},
        countIas: 0,
        countDict: 0,
        countCalc : 0,
        countCard: 0
    };

    data.forEach(function(item) {
        for (var name in out) {
            if (name === item.type) {
                out[name][item.status] = item.count;
            }
        }
    });
    //out.ias = 1;

    ps = conn.prepareStatement(
        "select count(ID_CARD) as count from Z_BOBJ_REPO.T_CARD where IS_ACTIVE = true " +
        "union all " +
        "select count(ID_CALC) as count from Z_BOBJ_REPO.T_CALC where IS_ACTIVE = true " +
        "union all " +
        "select count(ID_DICTIONARY) as count from Z_BOBJ_REPO.T_DICTIONARY where IS_ACTIVE = true " +
        "union all " +
        "select count(ID_IAS) as count from Z_BOBJ_REPO.T_IAS where IS_ACTIVE = true "
    );
    result = ps.executeQuery();

    data = [];
    while (result.next()) {
        data.push({
            "count": result.getInteger(1),
        });
    }

    if (data[3]) out.countIas = data[3].count;
    if (data[2]) out.countDict = data[2].count;
    if (data[1]) out.countCalc = data[1].count;
    if (data[0]) out.countCard = data[0].count;

    $.response.setBody(JSON.stringify(out));
    $.response.status = $.net.http.OK;
    $.response.contentType = 'application/json';
}
